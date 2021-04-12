/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withOptionalSignal } from '../../common/with_optional_signal';
import { useAsync } from '../../common/hooks/use_async';
import { importList } from '../api';

const importListWithOptionalSignal = withOptionalSignal(importList);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useImportList = () => useAsync(importListWithOptionalSignal);
