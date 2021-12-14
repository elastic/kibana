/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/** @jsx jsx */

import { useEuiTheme } from '@elastic/eui';
import { Link } from 'react-router-dom';
import { css, jsx } from '@emotion/react';
import { Routes } from '../../routes';

/**
 * Top level application component
 */
const listItemCss = `
  margin-right: 30px;
`;

const Links = () => {
  return (
    <ul
      css={css`
        padding: 20px;
        display: flex;
      `}
    >
      <li css={listItemCss}>
        <Link to="/">Home</Link>
      </li>
      <li css={listItemCss}>
        <Link to="/process_tree">Process Tree</Link>
      </li>
      <li css={listItemCss}>
        <Link to="/session_leader_table">Session Leader Table</Link>
      </li>
    </ul>
  );
};

Links.displayName = 'Links';

export const Application = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        height: 100%;
        background: ${euiTheme.colors.emptyShade};
      `}
    >
      <Links />
      <Routes />
    </div>
  );
};

Application.displayName = 'Application';
