/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAlertAction } from '../../../../common/detection_engine/types';
import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectAttributes,
  SavedObjectsClient,
  SavedObject,
  Logger,
} from '../../../../../../../src/core/server';
import { IRuleActionsAttributesSavedObjectAttributes } from './types';
import { ruleActionsSavedObjectType } from './saved_object_mappings';

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations
 * @deprecated Remove this once we no longer need legacy migrations for rule actions (8.0.0)
 */
function isEmptyObject(obj: {}) {
  for (const attr in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, attr)) {
      return false;
    }
  }
  return true;
}

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations
 * @deprecated Remove this once we no longer need legacy migrations for rule actions (8.0.0)
 */
export const ruleActionsSavedObjectMigration = {
  '7.11.2': (
    doc: SavedObjectUnsanitizedDoc<IRuleActionsAttributesSavedObjectAttributes>
  ): SavedObjectSanitizedDoc<IRuleActionsAttributesSavedObjectAttributes> => {
    const { actions } = doc.attributes;
    const newActions = actions.reduce((acc, action) => {
      if (
        ['.servicenow', '.jira', '.resilient'].includes(action.action_type_id) &&
        action.params.subAction === 'pushToService'
      ) {
        // Future developer, we needed to do that because when we created this migration
        // we forget to think about user already using 7.11.0 and having an incident attribute build the right way
        // IMPORTANT -> if you change this code please do the same inside of this file
        // x-pack/plugins/alerting/server/saved_objects/migrations.ts
        const subActionParamsIncident =
          (action.params?.subActionParams as SavedObjectAttributes)?.incident ?? null;
        if (subActionParamsIncident != null && !isEmptyObject(subActionParamsIncident)) {
          return [...acc, action];
        }
        if (action.action_type_id === '.servicenow') {
          const {
            title,
            comments,
            comment,
            description,
            severity,
            urgency,
            impact,
            short_description: shortDescription,
          } = action.params.subActionParams as {
            title: string;
            description?: string;
            severity?: string;
            urgency?: string;
            impact?: string;
            comment?: string;
            comments?: Array<{ commentId: string; comment: string }>;
            short_description?: string;
          };
          return [
            ...acc,
            {
              ...action,
              params: {
                subAction: 'pushToService',
                subActionParams: {
                  incident: {
                    short_description: shortDescription ?? title,
                    description,
                    severity,
                    urgency,
                    impact,
                  },
                  comments: [
                    ...(comments ?? []),
                    ...(comment != null ? [{ commentId: '1', comment }] : []),
                  ],
                },
              },
            },
          ] as RuleAlertAction[];
        } else if (action.action_type_id === '.jira') {
          const {
            title,
            comments,
            description,
            issueType,
            priority,
            labels,
            parent,
            summary,
          } = action.params.subActionParams as {
            title: string;
            description: string;
            issueType: string;
            priority?: string;
            labels?: string[];
            parent?: string;
            comments?: unknown[];
            summary?: string;
          };
          return [
            ...acc,
            {
              ...action,
              params: {
                subAction: 'pushToService',
                subActionParams: {
                  incident: {
                    summary: summary ?? title,
                    description,
                    issueType,
                    priority,
                    labels,
                    parent,
                  },
                  comments,
                },
              },
            },
          ] as RuleAlertAction[];
        } else if (action.action_type_id === '.resilient') {
          const { title, comments, description, incidentTypes, severityCode, name } = action.params
            .subActionParams as {
            title: string;
            description: string;
            incidentTypes?: number[];
            severityCode?: number;
            comments?: unknown[];
            name?: string;
          };
          return [
            ...acc,
            {
              ...action,
              params: {
                subAction: 'pushToService',
                subActionParams: {
                  incident: {
                    name: name ?? title,
                    description,
                    incidentTypes,
                    severityCode,
                  },
                  comments,
                },
              },
            },
          ] as RuleAlertAction[];
        }
      }

      return [...acc, action];
    }, [] as RuleAlertAction[]);

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        actions: newActions,
      },
      references: doc.references || [],
    };
  },
};

/**
 *
 * Dangerous workaround for alerting saved object migrations where we migrate actions side car models directly to the actions
 * array on alerts. The current
 *
 * TODO: When/If support for doing joins with migrations is solved:
 * (https://github.com/elastic/kibana/issues/109188)
 *
 * Then move this code over to ensure migrations. However, if we are sure that all customers have since 7.16+ at least started
 * Kibana once for this migration to run, then this code can also be removed.
 *
 * If this code does not run or a user is not migrated, the worst case is that rules/alerts which had an interval of
 * "hour/daily/weekly" will end up showing as having "no actions" for their alerting/rule and will need a user to manually
 * click the alert/rule "no actions" to change it to "hour/daily/weekly"
 *
 * This is labeled "dangerous" because this exists outside of the normal SavedObject migration process and always has to run
 * on startup which slows down startup and has to be maintained for a prolonged period of time. This pattern should BE AVOIDED,
 * and normal migration hooks should be used.
 *
 * NOTE: savedObjectClient.resolve() is used since we don't know how far in the future the migrations are going to run for this
 * dangerous migration function. The ID could have been re-generated and this is the safest to hope we can migrate farther in the future.
 * @param savedObjectsClient The saved objects client
 * @param logger The logger to log messages
 * @deprecated Remove this once we are upgraded or we have better migrations and this code is safely moved to that area.
 */
export const dangerousWorkaroundToMigrateActionsSideCarSavedObjects = async ({
  logger,
  savedObjectsClient,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClient;
}): Promise<void> => {
  const finder = savedObjectsClient.createPointInTimeFinder<SideCarAction>({
    perPage: 100,
    type: ruleActionsSavedObjectType,
  });
  let foundItems: Array<SavedObject<SideCarAction>> = [];
  for await (const response of finder.find()) {
    const sideCarActions = response.saved_objects;
    logger.info(
      `Starting a batch of migrating saved objects ${ruleActionsSavedObjectType} of length ${sideCarActions.length}`
    );
    for (const sideCarAction of sideCarActions) {
      logger.info(`Migrating action saved_object with id: ${sideCarAction.id}`);
      const { ruleAlertId, actions } = sideCarAction.attributes;
      logger.info(
        `Migrating actions of length: ${actions.length} on saved_object id: ${sideCarAction.id}`
      );
      // TODO: Start here to finish
      const found = await savedObjectsClient.resolve('alerts', ruleAlertId);
      logger.info(`Found this alert', ${JSON.stringify(found)}`);
    }
    foundItems = [...response.saved_objects, ...foundItems];
  }
  finder.close();
};

/**
 * NOTE: I intentionally do _NOT_ use other types from other parts of the system such as
 * Kibana alerting because as those types evolve and change this structure will not. This is
 * migration code which should feel like it is written in "stone" and not actively maintained.
 * Once "dangerousWorkaroundToMigrateActionsSideCarSavedObjects" is removed, this should be too.
 * This type should _never_ be used outside of this one use case.
 * @deprecated Remove this once "dangerousWorkaroundToMigrateActionsSideCarSavedObjects" is removed.
 */
interface SideCarAction {
  ruleAlertId: string;
  actions: Array<{
    id: string;
    params: {
      message: string;
    };
    action_type_id: string;
    group: string;
  }>;
  ruleThrottle: string;
  alertThrottle: string;
}
