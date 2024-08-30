/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from "@kbn/lists-plugin/server/routes/utils";
import { transformError } from "@kbn/securitysolution-es-utils";
import type { IKibanaResponse } from "@kbn/core-http-server";
import { withRiskEnginePrivilegeCheck } from "../risk_engine_privileges";
import {
  RISK_ENGINE_INSTALLATION_AND_DATA_CLEANUP_URL,
  APP_ID,
} from "../../../../../common/constants";
import type { EntityAnalyticsRoutesDeps } from "../../types";
import { RiskEngineAuditActions } from "../audit";
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from "../../audit";
import { TASK_MANAGER_UNAVAILABLE_ERROR } from "./translations";

export const riskEngineCleanupRoute = (
  router: EntityAnalyticsRoutesDeps["router"],
  getStartServices: EntityAnalyticsRoutesDeps["getStartServices"]
) => {
  router.versioned
    .delete({
      access: "public",
      path: RISK_ENGINE_INSTALLATION_AND_DATA_CLEANUP_URL,
      options: {
        tags: ["access:securitySolution", `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      { version: "1", validate: {} },
      withRiskEnginePrivilegeCheck(
        getStartServices,
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<{ success: boolean }>> => {
          const siemResponse = buildSiemResponse(response);
          const securitySolution = await context.securitySolution;
          const [_, { taskManager }] = await getStartServices();

          if (!taskManager) {
            securitySolution.getAuditLogger()?.log({
              message:
                "User attempted to perform a cleanup of risk engine, but the Kibana Task Manager was unavailable",
              event: {
                action: RiskEngineAuditActions.RISK_ENGINE_REMOVE_TASK,
                category: AUDIT_CATEGORY.DATABASE,
                type: AUDIT_TYPE.DELETION,
                outcome: AUDIT_OUTCOME.FAILURE,
              },
              error: {
                message:
                  "User attempted to perform a cleanup of risk engine, but the Kibana Task Manager was unavailable",
              },
            });

            return siemResponse.error({
              statusCode: 400,
              body: TASK_MANAGER_UNAVAILABLE_ERROR,
            });
          }

          const riskEngineClient = securitySolution.getRiskEngineDataClient();
          const riskScoreDataClient = securitySolution.getRiskScoreDataClient();

          try {
            await riskEngineClient.tearDown({
              taskManager,
              riskScoreDataClient,
            });

            return response.ok({ body: { success: true } });
          } catch (e) {
            const error = transformError(e);
            return siemResponse.error({
              statusCode: error.statusCode,
              body: { message: error.message, full_error: JSON.stringify(e) },
              bypassErrorFormat: true,
            });
          }
        }
      )
    );
};
