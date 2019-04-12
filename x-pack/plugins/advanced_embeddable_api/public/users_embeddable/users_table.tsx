/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  EuiBasicTable,
  // @ts-ignore
  EuiCard,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { executeTriggerActions, getActionsForTrigger } from 'plugins/embeddable_api/index';
import React from 'react';
import { EMAIL_EMPLOYEE_TRIGGER, UsersEmbeddable, VIEW_EMPLOYEE_TRIGGER } from './users_embeddable';
import { User } from './users_embeddable_factory';

interface Props {
  embeddable: UsersEmbeddable;
}

interface State {
  users: User[];
  viewActionIsConfigured: boolean;
  emailActionIsConfigured: boolean;
}

export class UsersTable extends React.Component<Props, State> {
  private mounted = false;
  private unsubscribe?: () => void;

  constructor(props: Props) {
    super(props);
    const { users } = props.embeddable.getOutput();
    this.state = { users, viewActionIsConfigured: false, emailActionIsConfigured: false };
  }

  public getColumns() {
    return [
      {
        field: 'name',
        name: 'Name',
        render: (name: string) => <EuiLink onClick={() => this.onView(name)}>{name}</EuiLink>,
      },
      {
        field: 'email',
        name: 'Email',
        render: (email: string) => <EuiLink onClick={() => this.onEmail(email)}>{email}</EuiLink>,
      },
      {
        field: 'username',
        name: 'User name',
      },
    ];
  }

  public async componentDidMount() {
    this.mounted = true;
    this.unsubscribe = this.props.embeddable.subscribeToOutputChanges(() => {
      if (this.mounted) {
        const { users } = this.props.embeddable.getOutput();
        this.setState({ users });
      }
    });

    const viewActions = await getActionsForTrigger(VIEW_EMPLOYEE_TRIGGER, {
      embeddable: this.props.embeddable,
    });

    const emailActions = await getActionsForTrigger(EMAIL_EMPLOYEE_TRIGGER, {
      embeddable: this.props.embeddable,
    });

    if (this.mounted) {
      this.setState({
        emailActionIsConfigured: emailActions.length > 0,
        viewActionIsConfigured: viewActions.length > 0,
      });
    }
  }

  public componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.mounted = false;
  }

  public render() {
    return (
      <EuiFlexItem key={this.props.embeddable.id}>
        <EuiBasicTable sorting={{}} items={this.state.users} columns={this.getColumns()} />
      </EuiFlexItem>
    );
  }

  private onView = (name: string) => {
    executeTriggerActions(VIEW_EMPLOYEE_TRIGGER, {
      embeddable: this.props.embeddable,
      triggerContext: { name },
    });
  };

  private onEmail = (email: string) => {
    executeTriggerActions(EMAIL_EMPLOYEE_TRIGGER, {
      embeddable: this.props.embeddable,
      triggerContext: { email },
    });
  };
}
