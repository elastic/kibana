/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { HeaderPage, HeaderPageProps } from '../../../common/components/header_page';
import * as i18n from './translations';

const CaseHeaderPageComponent: React.FC<HeaderPageProps> = (props) => <HeaderPage {...props} />;

CaseHeaderPageComponent.defaultProps = {
  badgeOptions: {
    beta: true,
    text: i18n.PAGE_BADGE_LABEL,
    tooltip: i18n.PAGE_BADGE_TOOLTIP,
  },
};

export const CaseHeaderPage = React.memo(CaseHeaderPageComponent);
