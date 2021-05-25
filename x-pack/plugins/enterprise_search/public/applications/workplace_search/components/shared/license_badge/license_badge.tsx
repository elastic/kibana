/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge } from '@elastic/eui';

import './license_badge.scss';

const licenseColor = '#00A7B1';

export const LicenseBadge: React.FC = () => (
  <EuiBadge className="wsLicenseBadge" color={licenseColor}>
    <span className="wsLicenseBadge__text">Platinum Feature</span>
  </EuiBadge>
);
