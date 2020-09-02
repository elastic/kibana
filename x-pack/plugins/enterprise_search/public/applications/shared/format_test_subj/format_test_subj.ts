/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _camelCase from 'lodash/camelCase';
import _upperFirst from 'lodash/upperFirst';

export const formatTestSubj = (str: string) => _upperFirst(_camelCase(str));
