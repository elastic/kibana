/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { useMemo } from 'react';

export const useDataIngestionHubHeaderVideoModalStyles = () => {
  const dataIngestionHubHeaderStyles = useMemo(() => {
    return {
      modalFooterStyles: css({
        justifyContent: 'center',
      }),
      modalBodyStyles: css({
        '.euiModalBody__overflow': { padding: '0px', maskImage: 'none' },
        overflow: 'hidden',
        padding: '0px',
        height: '312px',
      }),
      modalTitleStyles: css({ textAlign: 'center', fontSize: '1.375rem', fontWeight: 700 }),
      modalDescriptionStyles: css({ textAlign: 'center' }),
      modalStyles: css({ width: 550 }),
    };
  }, []);
  return dataIngestionHubHeaderStyles;
};
