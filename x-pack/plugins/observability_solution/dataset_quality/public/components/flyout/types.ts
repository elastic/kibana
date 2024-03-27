/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutDataset } from '../../state_machines/dataset_quality_controller';

export interface FlyoutProps {
  dataset: FlyoutDataset;
  closeFlyout: () => void;
}
