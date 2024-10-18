/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { History } from 'history';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import { SearchAIAssistantPageTemplate } from '../page_template';
import { ConversationViewWithProps } from './conversations/conversation_view_with_props';

export const SearchAssistantRouter: React.FC<{ history: History }> = ({ history }) => {
  return (
    <SearchAIAssistantPageTemplate>
      <Router history={history}>
        <Routes>
          <Redirect from="/" to="/conversations/new" exact />
          <Redirect from="/conversations" to="/conversations/new" exact />
          <Route path="/conversations/new" exact>
            <ConversationViewWithProps />
          </Route>
          <Route path="/conversations/:conversationId">
            <ConversationViewWithProps />
          </Route>
        </Routes>
      </Router>
    </SearchAIAssistantPageTemplate>
  );
};
