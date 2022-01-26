/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const cached = useMemo(() => {
    const tabSection: CSSObject = {
      padding: '16px',
    };

    const tabListTitle: CSSObject = {
      width: '40%',
    };

    const tabListDescription: CSSObject = {
      width: '60%',
    };

    const tabDescriptionSemibold: CSSObject = {
      fontWeight: 500,
    };

    const executableAction: CSSObject = {
      fontWeight: 600,
      paddingLeft: '4px',
    };

    const tabAccordion: CSSObject = {
      borderTop: '1px solid #D4DAE5',
    };

    const tabAccordionButton: CSSObject = {
      height: '56px',
      paddingLeft: '16px',
      fontWeight: 700,
    };

    return {
      tabAccordion,
      tabAccordionButton,
      tabSection,
      tabListTitle,
      tabListDescription,
      tabDescriptionSemibold,
      executableAction,
    };
  }, []);

  return cached;
};
