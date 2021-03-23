/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo, useEffect, useState } from 'react';
import { EuiToolTip, EuiLink, EuiMarkdownAstNodePosition } from '@elastic/eui';

// import { useLensClick } from '../../../../utils/lens/use_lens_click';
import { LensProps } from './types';
import * as i18n from './translations';
import { useKibana } from '../../../../lib/kibana';

export const LensMarkDownRendererComponent: React.FC<
  LensProps & {
    position: EuiMarkdownAstNodePosition;
  }
> = ({ id, title, graphEventId }) => {
  const kibana = useKibana();
  const LensComponent = kibana?.services?.lens?.EmbeddableComponent!;

  return (
    <LensComponent
      id=""
      style={{ height: 200 }}
      timeRange={{
        from: 'now-5d',
        to: 'now',
      }}
      savedObjectId={id}
    />
  );
};

export const LensMarkDownRenderer = LensMarkDownRendererComponent;
