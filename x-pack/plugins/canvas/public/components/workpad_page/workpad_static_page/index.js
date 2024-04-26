/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withProps } from 'react-recompose';
import { simplePositioning } from '../positioning_utils';
import { StaticWorkpadPage } from './static_workpad_page';

export const StaticPage = () => withProps(simplePositioning)(StaticWorkpadPage);
