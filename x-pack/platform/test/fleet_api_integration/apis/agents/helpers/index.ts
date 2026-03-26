/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getBaseUrl(spaceId?: string) {
  return spaceId ? `/s/${spaceId}` : '';
}

export async function checkBulkAgentAction(
  supertestAgent: any,
  actionId: string,
  spaceId?: string,
  verifyActionResult?: Function
) {
  await new Promise((resolve, reject) => {
    let attempts = 0;
    const intervalId = setInterval(async () => {
      if (attempts > 5) {
        clearInterval(intervalId);
        reject(new Error('action timed out'));
      }
      ++attempts;
      const {
        body: { items: actionStatuses },
      } = await supertestAgent
        .get(`${getBaseUrl(spaceId)}/api/fleet/agents/action_status`)
        .set('kbn-xsrf', 'xxx');
      const action = actionStatuses?.find((a: any) => a.actionId === actionId);
      if (
        action &&
        action.nbAgentsActioned === action.nbAgentsActionCreated + action.nbAgentsFailed
      ) {
        clearInterval(intervalId);
        if (verifyActionResult) {
          await verifyActionResult();
        }
        resolve({});
      }
    }, 3000);
  }).catch((e) => {
    throw e;
  });
}
