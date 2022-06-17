/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { withEmbeddableSubscription } from '@kbn/embeddable-plugin/public';

import { MatrixHistogramComponent } from '.';

export const MatrixHistogramEmbeddableComponent = withEmbeddableSubscription<
  MatrixHistogramInput,
  MatrixHistogramOutput,
  MatrixHistogramEmbeddable
>(MatrixHistogramComponent);
