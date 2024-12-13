/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';

export const useConnectorSelectorWithIconStyles = () => {
  return {
    inputContainerClassName: css`
      height: 32px;

      .euiSuperSelectControl {
        border: none;
        box-shadow: none;
        background: none;
        padding-left: 0;
      }

      .euiFormControlLayoutIcons {
        right: 14px;
        top: 2px;
      }
    `,
    inputDisplayClassName: css`
      margin-right: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
  };
};
