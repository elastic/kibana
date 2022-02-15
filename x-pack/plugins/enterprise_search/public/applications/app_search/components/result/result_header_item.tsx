/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import './result_header_item.scss';

import { EuiLinkTo } from '../../../shared/react_router_helpers/eui_components';

import { TruncatedContent } from '../../../shared/truncate';

interface Props {
  field: string;
  value?: string | number;
  type: 'id' | 'score' | 'string' | 'clicks';
  href?: string;
}

const MAX_CHARACTER_LENGTH = 30;

export const ResultHeaderItem: React.FC<Props> = ({ field, type, value, href }) => {
  let formattedValue = '-';
  if (typeof value === 'string') {
    formattedValue = value;
  } else if (typeof value === 'number') {
    if (type === 'clicks') {
      formattedValue = i18n.translate('xpack.enterpriseSearch.appSearch.result.clicks', {
        defaultMessage: '{clicks} Clicks',
        values: { clicks: value },
        description: 'This is click count for Adaptive Relevance suggestion results',
      });
    } else {
      formattedValue = parseFloat((value as number).toFixed(2)).toString();
    }
  }

  const HeaderItemContent = () => (
    <TruncatedContent
      content={formattedValue}
      length={MAX_CHARACTER_LENGTH}
      tooltipType="title"
      beginning={type === 'id'}
    />
  );

  return (
    <span
      className={`appSearchResultHeaderItem ${
        type === 'score' && 'appSearchResultHeaderItem__score'
      }`}
    >
      {type !== 'clicks' && (
        <>
          <TruncatedContent
            content={`${field}:`}
            length={MAX_CHARACTER_LENGTH}
            tooltipType="title"
          />
          &nbsp;
        </>
      )}
      {href ? (
        <EuiLinkTo to={href}>
          <HeaderItemContent />
        </EuiLinkTo>
      ) : (
        <HeaderItemContent />
      )}
    </span>
  );
};
