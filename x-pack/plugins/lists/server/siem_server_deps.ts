/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export {
  transformError,
  buildSiemResponse,
} from '../../siem/server/lib/detection_engine/routes/utils'; // eslint-disable-line @kbn/eslint/no-restricted-paths
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { deleteTemplate } from '../../siem/server/lib/detection_engine/index/delete_template';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { deletePolicy } from '../../siem/server/lib/detection_engine/index/delete_policy';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { deleteAllIndex } from '../../siem/server/lib/detection_engine/index/delete_all_index';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { setPolicy } from '../../siem/server/lib/detection_engine/index/set_policy';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { setTemplate } from '../../siem/server/lib/detection_engine/index/set_template';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { getTemplateExists } from '../../siem/server/lib/detection_engine/index/get_template_exists';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { getPolicyExists } from '../../siem/server/lib/detection_engine/index/get_policy_exists';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { createBootstrapIndex } from '../../siem/server/lib/detection_engine/index/create_bootstrap_index';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { getIndexExists } from '../../siem/server/lib/detection_engine/index/get_index_exists';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { buildRouteValidation } from '../../siem/server/utils/build_validation/route_validation';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { validate } from '../../siem/server/lib/detection_engine/routes/rules/validate';
