/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable no-console */
import yargs from 'yargs';
import { KbnClient, ToolingLog } from '@kbn/dev-utils';
import {
  CaseResponse,
  CaseType,
  CollectionWithSubCaseResponse,
  ConnectorTypes,
} from '../../../common/api';
import { CommentType } from '../../../common/api/cases/comment';
import { CASES_URL } from '../../../common/constants';
import { ActionResult, ActionTypeExecutorResult } from '../../../../actions/common';
import { ContextTypeGeneratedAlertType } from '../../connectors';

/**
 * Separator field for the case connector alerts string parser.
 */
const separator = '__SEPARATOR__';

interface AlertIDIndex {
  _id: string;
  _index: string;
}

main();

/**
 * Creates the format that the connector's parser is expecting, it should result in something like this:
 * [{"_id":"1","_index":"index1"}__SEPARATOR__{"_id":"id2","_index":"index2"}__SEPARATOR__]
 */
function createAlertsString(alerts: AlertIDIndex[]) {
  return `[${alerts.reduce((acc, alert) => {
    return `${acc}${JSON.stringify(alert)}${separator}`;
  }, '')}]`;
}

function createClient(argv: any): KbnClient {
  return new KbnClient({
    log: new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    }),
    url: argv.kibana,
  });
}

async function handleFind(argv: any) {
  const client = createClient(argv);

  try {
    const res = await client.request({
      path: `${CASES_URL}/${argv.caseID}/sub_cases/_find`,
      method: 'GET',
      query: {
        status: argv.status,
      },
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function handleDelete(argv: any) {
  const client = createClient(argv);

  try {
    await client.request({
      path: `${CASES_URL}?ids=["${argv.id}"]`,
      method: 'DELETE',
      query: {
        force: true,
      },
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function handleGenGroupAlerts(argv: any) {
  const client = createClient(argv);

  try {
    const createdAction = await client.request<ActionResult>({
      path: '/api/actions/action',
      method: 'POST',
      body: {
        name: 'A case connector',
        actionTypeId: '.case',
        config: {},
      },
    });

    let caseID: string | undefined = argv.caseID as string | undefined;

    if (!caseID) {
      console.log('Creating new case');
      const newCase = await client.request<CaseResponse>({
        path: CASES_URL,
        method: 'POST',
        body: {
          description: 'This is a brand new case from generator script',
          type: CaseType.collection,
          title: 'Super Bad Security Issue',
          tags: ['defacement'],
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          settings: {
            syncAlerts: true,
          },
        },
      });
      caseID = newCase.data.id;
    }

    console.log('Case id: ', caseID);
    const comment: ContextTypeGeneratedAlertType = {
      type: CommentType.generatedAlert,
      alerts: createAlertsString(
        argv.ids.map((id: string) => ({ _id: id, _index: argv.signalsIndex }))
      ),
    };

    const executeResp = await client.request<
      ActionTypeExecutorResult<CollectionWithSubCaseResponse>
    >({
      path: `/api/actions/action/${createdAction.data.id}/_execute`,
      method: 'POST',
      body: {
        params: {
          subAction: 'addComment',
          subActionParams: {
            caseId: caseID,
            comment,
          },
        },
      },
    });

    if (executeResp.data.status !== 'ok') {
      console.log(
        'Error received from actions api during execute: ',
        JSON.stringify(executeResp.data, null, 2)
      );
      process.exit(1);
    }

    console.log('Execution response ', JSON.stringify(executeResp.data, null, 2));
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function main() {
  // This returns before the async handlers do
  // We need to convert this to commander instead I think
  yargs(process.argv.slice(2))
    .help()
    .options({
      kibana: {
        alias: 'k',
        describe: 'kibana url',
        default: 'http://XavierM:Ry4t9RHeCXEwPzj@localhost:5601',
        type: 'string',
      },
    })
    .command({
      command: 'alerts',
      aliases: ['gen', 'genAlerts'],
      describe: 'generate a group of alerts',
      builder: (args) => {
        return args
          .options({
            caseID: {
              alias: 'c',
              describe: 'case ID',
            },
            ids: {
              alias: 'a',
              describe: 'alert ids',
              type: 'array',
            },
            signalsIndex: {
              alias: 'i',
              describe: 'siem signals index',
              type: 'string',
              default: '.siem-signals-default',
            },
          })
          .demandOption(['ids']);
      },
      handler: async (args) => {
        return handleGenGroupAlerts(args);
      },
    })
    .command({
      command: 'delete <id>',
      describe: 'deletes a case',
      builder: (args) => {
        return args.positional('id', {
          describe: 'case id',
          type: 'string',
        });
      },
      handler: async (args) => {
        return handleDelete(args);
      },
    })
    .command({
      command: 'find <caseID> [status]',
      describe: 'gets all sub cases',
      builder: (args) => {
        return args
          .positional('caseID', { describe: 'case id', type: 'string' })
          .positional('status', {
            describe: 'filter by status',
            type: 'string',
          });
      },
      handler: async (args) => {
        return handleFind(args);
      },
    })
    .demandCommand()
    .parse();

  console.log('completed');
}
