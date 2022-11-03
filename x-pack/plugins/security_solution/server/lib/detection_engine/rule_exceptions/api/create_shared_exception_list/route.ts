/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// export const createSharedExceptionListRoute = (router: SecuritySolutionPluginRouter) => {
//   router.post(
//     {
//       path: CREATE_RULE_EXCEPTIONS_URL,
//       validate: {
//         params: buildRouteValidation<
//           typeof CreateSharedExceptionListRequestParams,
//           CreateSharedExceptionListRequestParamsDecoded
//         >(CreateSharedExceptionListRequestParams),
//         body: buildRouteValidation<
//           typeof CreateSharedExceptionListRequestParamsBody,
//           CreateSharedExceptionListRequestParamsBodyDecoded
//         >(CreateSharedExceptionListRequestParamsBody),
//       },
//       options: {
//         tags: ['access:securitySolution'],
//       },
//     },
//     async (context, request, response) => {
//       const siemResponse = buildSiemResponse(response);

//       try {
//         const ctx = await context.resolve([
//           'core',
//           'securitySolution',
//           'alerting',
//           'licensing',
//           'lists',
//         ]);
//         const listsClient = ctx.securitySolution.getExceptionListClient();
//       } catch (exc) {
//         console.error(exc);
//       }
//     }
//   );
// };
