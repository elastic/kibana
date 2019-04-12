/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import {
  EuiButton,
  EuiCallOut,
  EuiCard,
  EuiFieldText,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { executeTriggerActions, getActionsForTrigger } from 'plugins/embeddable_api/index';
import React from 'react';
import { User } from '../users_embeddable/users_embeddable_factory';
import { EMAIL_USER_TRIGGER, UserEmbeddable, VIEW_USER_TRIGGER } from './user_embeddable';

interface Props {
  embeddable: UserEmbeddable;
}

interface State {
  user?: User;
  error?: string;
  viewActionIsConfigured: boolean;
  emailActionIsConfigured: boolean;
  username?: string;
}

export class UserCard extends React.Component<Props, State> {
  private mounted = false;
  private unsubscribe?: () => void;

  constructor(props: Props) {
    super(props);
    const { user, error } = props.embeddable.getOutput();
    this.state = {
      user,
      username: props.embeddable.getInput().username,
      error,
      viewActionIsConfigured: false,
      emailActionIsConfigured: false,
    };
  }

  public renderCardFooterContent() {
    return (
      <div>
        <EuiButton onClick={() => this.onView()}>View</EuiButton>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <p>
            <EuiLink onClick={() => this.onEmail()}>Email</EuiLink>
          </p>
        </EuiText>
      </div>
    );
  }

  public async componentDidMount() {
    this.mounted = true;
    this.unsubscribe = this.props.embeddable.subscribeToOutputChanges(() => {
      if (this.mounted) {
        const { user, error } = this.props.embeddable.getOutput();
        this.setState({ user, error });
      }
    });

    const viewActions = await getActionsForTrigger(VIEW_USER_TRIGGER, {
      embeddable: this.props.embeddable,
    });

    const emailActions = await getActionsForTrigger(EMAIL_USER_TRIGGER, {
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

  public changeUser = () => {
    if (this.state.username) {
      this.props.embeddable.updateInput({
        username: this.state.username,
      });
    }
  };

  public render() {
    return (
      <EuiFlexItem key={this.props.embeddable.id}>
        {this.state.user ? (
          <EuiCard
            title={this.state.username}
            description={this.state.user.name}
            footer={this.renderCardFooterContent()}
          />
        ) : (
          <EuiCallOut color="danger">
            Error:{this.state.error ? this.state.error.message : ''}
            <EuiFormRow>
              <EuiFieldText onChange={e => this.setState({ username: e.target.value })} />
            </EuiFormRow>
            <EuiButton onClick={this.changeUser}>Change user</EuiButton>
          </EuiCallOut>
        )}
      </EuiFlexItem>
    );
  }

  private onView = () => {
    executeTriggerActions(VIEW_USER_TRIGGER, {
      embeddable: this.props.embeddable,
      triggerContext: {},
    });
  };

  private onEmail = () => {
    executeTriggerActions(EMAIL_USER_TRIGGER, {
      embeddable: this.props.embeddable,
      triggerContext: {},
    });
  };
}
