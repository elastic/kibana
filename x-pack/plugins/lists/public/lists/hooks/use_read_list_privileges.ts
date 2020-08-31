/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withOptionalSignal } from '../../common/with_optional_signal';
import { useAsync } from '../../common/hooks/use_async';
import { readListPrivileges } from '../api';

const readListPrivilegesWithOptionalSignal = withOptionalSignal(readListPrivileges);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useReadListPrivileges = () => useAsync(readListPrivilegesWithOptionalSignal);
