/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './authentication_state_page.scss';

import { EuiIcon, EuiImage, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

interface Props {
  className?: string;
  title: React.ReactNode;
  logo?: string;
}

export const AuthenticationStatePage: React.FC<Props> = (props) => (
  <div className={`secAuthenticationStatePage ${props.className || ''}`}>
    <header className="secAuthenticationStatePage__header">
      <div className="secAuthenticationStatePage__content eui-textCenter">
        <EuiSpacer size="xxl" />
        <span className="secAuthenticationStatePage__logo">
          {props.logo ? (
            <EuiImage src={props.logo} size={40} alt={'logo'} />
          ) : (
            <EuiIcon type="logoElastic" size="xxl" />
          )}
        </span>
        <EuiTitle size="l" className="secAuthenticationStatePage__title">
          <h1>{props.title}</h1>
        </EuiTitle>
        <EuiSpacer size="xl" />
      </div>
    </header>
    <div className="secAuthenticationStatePage__content eui-textCenter">{props.children}</div>
  </div>
);
