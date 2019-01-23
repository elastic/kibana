/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Route, Switch, Redirect } from 'react-router-dom';
import chrome from 'ui/chrome';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import { BASE_PATH } from '../../common/constants';
import { SectionUnauthorized } from './components';
import routing from './services/routing';
import { isAvailable, isActive, getReason } from './services/license';

import {
  CrossClusterReplicationHome,
  AutoFollowPatternAdd,
  AutoFollowPatternEdit,
  FollowerIndexAdd,
  FollowerIndexEdit,
} from './sections';

export const App = injectI18n(
  class extends Component {
    static contextTypes = {
      router: PropTypes.shape({
        history: PropTypes.shape({
          push: PropTypes.func.isRequired,
          createHref: PropTypes.func.isRequired
        }).isRequired
      }).isRequired
    }

    constructor(...args) {
      super(...args);
      this.registerRouter();
    }

    componentWillMount() {
      routing.userHasLeftApp = false;
    }

    componentWillUnmount() {
      routing.userHasLeftApp = true;
    }

    registerRouter() {
      const { router } = this.context;
      routing.reactRouter = router;
    }

    render() {
      if (!isAvailable() || !isActive()) {
        return (
          <SectionUnauthorized
            title={(
              <FormattedMessage
                id="xpack.crossClusterReplication.home.licenseErrorTitle"
                defaultMessage="License error"
              />
            )}
          >
            {getReason()}
            {' '}
            <a href={chrome.addBasePath('/app/kibana#/management/elasticsearch/license_management/home')}>
              <FormattedMessage
                id="xpack.crossClusterReplication.home.licenseErrorLinkText"
                defaultMessage="Manage your license."
              />
            </a>
          </SectionUnauthorized>
        );
      }

      return (
        <div>
          <Switch>
            <Redirect exact from={`${BASE_PATH}`} to={`${BASE_PATH}/follower_indices`} />
            <Route exact path={`${BASE_PATH}/auto_follow_patterns/add`} component={AutoFollowPatternAdd} />
            <Route exact path={`${BASE_PATH}/auto_follow_patterns/edit/:id`} component={AutoFollowPatternEdit} />
            <Route exact path={`${BASE_PATH}/follower_indices/add`} component={FollowerIndexAdd} />
            <Route exact path={`${BASE_PATH}/follower_indices/edit/:id`} component={FollowerIndexEdit} />
            <Route exact path={`${BASE_PATH}/:section`} component={CrossClusterReplicationHome} />
          </Switch>
        </div>
      );
    }
  }
);
