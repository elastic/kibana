/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';
import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { GitBlame } from '../../../common/git_blame';

export class Blame extends React.PureComponent<{ blame: GitBlame; isFirstLine: boolean }> {
  public render(): React.ReactNode {
    const { blame, isFirstLine } = this.props;
    return (
      <EuiFlexGroup
        className={isFirstLine ? 'codeBlame__item codeBlame__item--first ' : 'codeBlame__item'}
        gutterSize="none"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiAvatar
                size="s"
                type="space"
                className="codeAvatar"
                name={blame.committer.name}
                initialsLength={1}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" className="codeText__blameMessage eui-textTruncate">
                {blame.commit.message}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="eui-textTruncate">
          <EuiText size="xs" className="eui-textTruncate code-auto-margin">
            <EuiTextColor color="subdued">{moment(blame.commit.date).fromNow()}</EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
