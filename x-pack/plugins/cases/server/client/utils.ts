/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorTypes } from '../../common/api';
import { CaseConnectorTypes } from '../connectors';

export const isConnectorSupported = (type: string): type is CaseConnectorTypes =>
  connectorTypes.includes(type as CaseConnectorTypes);
