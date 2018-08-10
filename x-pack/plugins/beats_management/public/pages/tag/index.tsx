/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { Route, Switch } from 'react-router';
import { ConfigurationBlock } from '../../../common/domain_types';
import { PrimaryLayout } from '../../components/layouts/primary';
import { FrontendLibs } from '../../lib/lib';
import { CreateTagPage } from './create';
import { EditTagPage } from './edit';
interface EditTagPageProps {
  libs: FrontendLibs;
  history: any;
}

interface EditTagPageState {
  color: string | null;
  configurationBlocks: ConfigurationBlock[];
  showFlyout: boolean;
  tagName: string | null;
}

export class TagPage extends React.PureComponent<EditTagPageProps, EditTagPageState> {
  constructor(props: EditTagPageProps) {
    super(props);

    this.state = {
      color: '#DD0A73',
      configurationBlocks: [],
      showFlyout: false,
      tagName: null,
    };
  }

  public render() {
    return (
      <PrimaryLayout title="Create Tag">
        <Switch>
          <Route
            path="/tag/create"
            exact={true}
            render={(props: any) => <CreateTagPage libs={this.props.libs} {...props} />}
          />
          <Route
            path="/tag/edit/:tagid"
            exact={true}
            render={(props: any) => <EditTagPage libs={this.props.libs} {...props} />}
          />
        </Switch>
      </PrimaryLayout>
    );
  }
}
