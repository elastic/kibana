/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// this simply imports functions that run on the server from canvas_plugin_src.
// it's an ugly hack to trick Kibana's build into including dependencies in
// those functions which it would otherwise strip out.
// see https://github.com/elastic/kibana/issues/27729 for an example build issue.

import '../canvas_plugin_src/functions/server/src/index';
import '../canvas_plugin_src/functions/common/index';
