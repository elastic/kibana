/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { ReindexStatus, ReindexStep } from '../../../../../../../common/types';
import type { ReindexState } from '../use_reindex_state';
import { ReindexProgress } from './progress';

describe('ReindexProgress', () => {
  it('renders', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.created,
            status: ReindexStatus.inProgress,
            reindexTaskPercComplete: null,
            errorMessage: null,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiTitle
          data-test-subj="reindexChecklistTitle"
          size="xs"
        >
          <h3>
            <FormattedMessage
              defaultMessage="Reindexing in progress… {percents}"
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingInProgressTitle"
              values={
                Object {
                  "percents": "0%",
                }
              }
            />
          </h3>
        </EuiTitle>
        <StepProgress
          steps={
            Array [
              Object {
                "status": "inProgress",
                "title": <FormattedMessage
                  defaultMessage="Setting original index to read-only."
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.readonlyStepTitle"
                  values={Object {}}
                />,
              },
              Object {
                "status": "incomplete",
                "title": <FormattedMessage
                  defaultMessage="Create new index."
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.createIndexStepTitle"
                  values={Object {}}
                />,
              },
              Object {
                "status": "incomplete",
                "title": <ReindexingDocumentsStepTitle
                  cancelReindex={[MockFunction]}
                  reindexState={
                    Object {
                      "errorMessage": null,
                      "lastCompletedStep": 0,
                      "reindexTaskPercComplete": null,
                      "status": 0,
                    }
                  }
                />,
              },
              Object {
                "status": "incomplete",
                "title": <FormattedMessage
                  defaultMessage="Swap original index with alias."
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.aliasSwapStepTitle"
                  values={Object {}}
                />,
              },
            ]
          }
        />
      </Fragment>
    `);
  });

  it('displays errors in the step that failed', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.reindexCompleted,
            status: ReindexStatus.failed,
            reindexTaskPercComplete: 1,
            errorMessage: `This is an error that happened on alias switch`,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );
    const aliasStep = (wrapper.find('StepProgress').props() as any).steps[3];
    expect(aliasStep.children.props.errorMessage).toEqual(
      `This is an error that happened on alias switch`
    );
  });
});
