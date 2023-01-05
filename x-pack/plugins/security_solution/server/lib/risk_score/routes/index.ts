/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { createEsIndexRoute } from '../indices/create_index_route';
export { deleteEsIndicesRoute } from '../indices/delete_indices_route';

export { readPrebuiltDevToolContentRoute } from '../prebuilt_dev_tool_content/routes/read_prebuilt_dev_tool_content_route';

export { createPrebuiltSavedObjectsRoute } from '../prebuilt_saved_objects/routes/create_prebuilt_saved_objects';
export { deletePrebuiltSavedObjectsRoute } from '../prebuilt_saved_objects/routes/delete_prebuilt_saved_objects';

export { createStoredScriptRoute } from '../stored_scripts/create_script_route';
export { deleteStoredScriptRoute } from '../stored_scripts/delete_script_route';

export { getRiskScoreIndexStatusRoute } from '../index_status';

export { installRiskScoresRoute } from '../onboarding/routes/install_risk_scores';
