import * as t from 'io-ts';

import { commonSchema, Schema } from '../../../../../rule_registry/server/event_log/common';

export const executionEventFieldsSchema = Schema.create(t.type({}));

export const executionEventSchema = Schema.combine(commonSchema, executionEventFieldsSchema);
