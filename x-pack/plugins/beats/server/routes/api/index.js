/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerCreateEnrollmentTokensRoute } from './register_create_enrollment_tokens_route';
import { registerEnrollBeatRoute } from './register_enroll_beat_route';
import { registerListBeatsRoute } from './register_list_beats_route';
import { registerVerifyBeatsRoute } from './register_verify_beats_route';

export function registerApiRoutes(server) {
  registerCreateEnrollmentTokensRoute(server);
  registerEnrollBeatRoute(server);
  registerListBeatsRoute(server);
  registerVerifyBeatsRoute(server);
}
