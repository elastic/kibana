/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { Required } from 'utility-types';
import { Refresh } from '../../components/index_data_visualizer_view/index_data_visualizer_view';

export const mlTimefilterRefresh$ = new Subject<Required<Refresh>>();
