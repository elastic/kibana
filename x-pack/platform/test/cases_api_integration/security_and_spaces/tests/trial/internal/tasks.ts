/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type SuperTest from 'supertest';
import {
  CASES_TASK_TEMPLATES_URL,
  CASE_TASKS_URL,
  CASE_TASK_DETAILS_URL,
  CASE_TASK_COMMENTS_URL,
  CASE_TASKS_APPLY_TEMPLATE_URL,
  CASES_URL,
} from '@kbn/cases-plugin/common/constants';
import type { CaseTask } from '@kbn/cases-plugin/common/types/domain/task/v1';
import type { CaseTaskTemplate } from '@kbn/cases-plugin/common/types/domain/task_template/v1';
import { secOnly, secOnlyRead, superUser } from '../../../../common/lib/authentication/users';
import type { User } from '../../../../common/lib/authentication/types';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { createCase, deleteAllCaseItems, findCaseUserActions } from '../../../../common/lib/api';
import { getSpaceUrlPrefix } from '../../../../common/lib/api/helpers';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const request = (
  supertest: SuperTest.Agent,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  {
    body,
    user = superUser,
    space = null,
    expectedHttpCode = 200,
  }: { body?: unknown; user?: User; space?: string | null; expectedHttpCode?: number }
) =>
  supertest[method](`${getSpaceUrlPrefix(space)}${url}`)
    .auth(user.username, user.password)
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'foo')
    .send(body as object)
    .expect(expectedHttpCode)
    .then((res) => res.body);

const taskUrl = (caseId: string, taskId: string) =>
  CASE_TASK_DETAILS_URL.replace('{case_id}', caseId).replace('{task_id}', taskId);

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  interface Opts {
    user?: User;
    space?: string | null;
    expectedHttpCode?: number;
  }
  const agent = (opts: Opts) => (opts.user ? supertestWithoutAuth : supertest);
  const createTask = (caseId: string, body: Record<string, unknown>, opts: Opts = {}) =>
    request(agent(opts), 'post', CASE_TASKS_URL.replace('{case_id}', caseId), {
      body,
      ...opts,
    }) as Promise<CaseTask>;
  const listTasks = (caseId: string, opts: { user?: User; expectedHttpCode?: number } = {}) =>
    request(supertest, 'get', CASE_TASKS_URL.replace('{case_id}', caseId), opts) as Promise<{
      tasks: CaseTask[];
    }>;

  const taskList = {
    name: 'Phishing response',
    owner: 'securitySolutionFixture',
    tasks: [
      {
        title: 'Block sender',
        description: '',
        priority: 'high',
        relative_due_days: 1,
        subtasks: [
          { title: 'Confirm block', description: '', priority: 'medium', relative_due_days: null },
        ],
      },
      {
        title: 'Reset credentials',
        description: '',
        priority: 'critical',
        relative_due_days: null,
        subtasks: [],
      },
    ],
  };

  describe('tasks', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('creates, lists, updates, and deletes tasks with one level of sub-tasks', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());

      const root = await createTask(theCase.id, { title: 'Triage the alert', priority: 'high' });
      expect(root).to.have.property('id');
      expect(root.status).to.be('open');
      expect(root.sort_order).to.be(1000);
      expect(root.owner).to.be('securitySolutionFixture');

      const child = await createTask(theCase.id, {
        title: 'Check the sender',
        parent_task_id: root.id,
      });
      expect(child.parent_task_id).to.be(root.id);

      await createTask(
        theCase.id,
        { title: 'Too deep', parent_task_id: child.id },
        { expectedHttpCode: 400 }
      );

      const { tasks } = await listTasks(theCase.id);
      expect(tasks.map((t) => t.id).sort()).to.eql([root.id, child.id].sort());

      const completed = (await request(supertest, 'patch', taskUrl(theCase.id, root.id), {
        body: { version: root.version, status: 'completed' },
      })) as CaseTask;
      expect(completed.status).to.be('completed');
      expect(completed.completed_at).to.be.a('string');

      await request(supertest, 'delete', taskUrl(theCase.id, root.id), { expectedHttpCode: 204 });
      const { tasks: remaining } = await listTasks(theCase.id);
      expect(remaining).to.eql([]);

      const { userActions } = await findCaseUserActions({ supertest, caseID: theCase.id });
      const types = userActions.map((action) => action.type);
      expect(types).to.contain('create_task');
      expect(types).to.contain('update_task');
      expect(types).to.contain('delete_task');
    });

    it('applies a task list to a case and records it', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());
      const template = (await request(supertest, 'post', CASES_TASK_TEMPLATES_URL, {
        body: taskList,
      })) as CaseTaskTemplate;

      const { tasks } = (await request(
        supertest,
        'post',
        CASE_TASKS_APPLY_TEMPLATE_URL.replace('{case_id}', theCase.id),
        { body: { template_id: template.id } }
      )) as { tasks: CaseTask[] };

      expect(tasks.length).to.be(3);
      const roots = tasks.filter((t) => t.parent_task_id === null);
      const children = tasks.filter((t) => t.parent_task_id !== null);
      expect(roots.map((t) => t.title)).to.eql(['Block sender', 'Reset credentials']);
      expect(children[0].parent_task_id).to.be(roots[0].id);
      expect(tasks.every((t) => t.template_id === template.id)).to.be(true);
      expect(roots[0].due_date).to.be.a('string');

      const { userActions } = await findCaseUserActions({ supertest, caseID: theCase.id });
      expect(userActions.map((action) => action.type)).to.contain('apply_task_template');
    });

    it('seeds tasks when a case is created from a template that references a task list', async () => {
      const template = (await request(supertest, 'post', CASES_TASK_TEMPLATES_URL, {
        body: taskList,
      })) as CaseTaskTemplate;

      const caseTemplate = (await request(supertest, 'post', `${CASES_URL}/templates`, {
        body: {
          name: 'Phishing',
          owner: 'securitySolutionFixture',
          definition: `task_lists:\n  - ${template.id}\nfields: []\n`,
        },
      })) as { templateId: string };

      const theCase = await createCase(supertest, {
        ...getPostCaseRequest(),
        template: { id: caseTemplate.templateId },
      });

      const { tasks } = await listTasks(theCase.id);
      expect(tasks.length).to.be(3);
    });

    it('removes the tasks of a deleted case', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());
      await createTask(theCase.id, { title: 'Orphan candidate' });

      await request(supertest, 'delete', `${CASES_URL}?ids=${JSON.stringify([theCase.id])}`, {
        expectedHttpCode: 204,
      });

      const { count } = await es.count({ index: '.kibana_alerting_cases', q: 'type:cases-tasks' });
      expect(count).to.be(0);
    });

    it('keeps task comments on the task and removes them with it', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());
      const task = await createTask(theCase.id, { title: 'Discuss me' });
      const commentsUrl = CASE_TASK_COMMENTS_URL.replace('{case_id}', theCase.id).replace(
        '{task_id}',
        task.id
      );

      const comment = (await request(supertest, 'post', commentsUrl, {
        body: { comment: 'Gateway logs show nothing after 14:00.' },
      })) as { id: string; task_id: string };
      expect(comment.task_id).to.be(task.id);

      const { comments, total } = (await request(supertest, 'get', commentsUrl, {})) as {
        comments: Array<{ id: string }>;
        total: number;
      };
      expect(total).to.be(1);
      expect(comments[0].id).to.be(comment.id);

      const listed = await listTasks(theCase.id);
      expect(
        (listed as unknown as { comment_counts: Record<string, number> }).comment_counts[task.id]
      ).to.be(1);

      // Task notes must not appear in the case activity.
      const { userActions } = await findCaseUserActions({ supertest, caseID: theCase.id });
      expect(userActions.map((action) => action.type)).to.not.contain('comment');

      await request(supertest, 'delete', taskUrl(theCase.id, task.id), { expectedHttpCode: 204 });
      const { count } = await es.count({
        index: '.kibana_alerting_cases',
        q: 'type:cases-task-comments',
      });
      expect(count).to.be(0);
    });

    describe('rbac', () => {
      // The test roles hold their privileges in space1 only.
      const space = 'space1';
      const inSpace = (user: User, expectedHttpCode = 200) => ({ user, space, expectedHttpCode });

      it('lets a read-only user list but not create tasks', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest(), 200, {
          user: superUser,
          space,
        });
        await createTask(theCase.id, { title: 'Visible to readers' }, { space });

        const { tasks } = await listTasks(theCase.id, inSpace(secOnlyRead));
        expect(tasks.length).to.be(1);

        await createTask(theCase.id, { title: 'Not allowed' }, inSpace(secOnlyRead, 403));
      });

      it('lets a user with all privileges create tasks and task lists', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest(), 200, {
          user: superUser,
          space,
        });
        const task = await createTask(theCase.id, { title: 'Allowed' }, inSpace(secOnly));
        expect(task.title).to.be('Allowed');

        const template = (await request(supertestWithoutAuth, 'post', CASES_TASK_TEMPLATES_URL, {
          body: taskList,
          ...inSpace(secOnly),
        })) as CaseTaskTemplate;
        expect(template.name).to.be('Phishing response');

        await request(supertestWithoutAuth, 'post', CASES_TASK_TEMPLATES_URL, {
          body: taskList,
          ...inSpace(secOnlyRead, 403),
        });
      });
    });
  });
};
