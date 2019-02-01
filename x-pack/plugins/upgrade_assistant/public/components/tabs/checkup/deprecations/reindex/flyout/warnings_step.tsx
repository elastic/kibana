/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { ReindexWarning } from '../../../../../../../common/types';

export const idForWarning = (warning: ReindexWarning) => `reindexWarning-${warning}`;

interface WarningsConfirmationFlyoutProps {
  closeFlyout: () => void;
  warnings: ReindexWarning[];
  advanceNextStep: () => void;
}

interface WarningsConfirmationFlyoutState {
  checkedIds: { [id: string]: boolean };
}

/**
 * Displays warning text about destructive changes required to reindex this index. The user
 * must acknowledge each change before being allowed to proceed.
 */
export class WarningsFlyoutStep extends React.Component<
  WarningsConfirmationFlyoutProps,
  WarningsConfirmationFlyoutState
> {
  constructor(props: WarningsConfirmationFlyoutProps) {
    super(props);

    this.state = {
      checkedIds: props.warnings.reduce(
        (checkedIds, warning) => {
          checkedIds[idForWarning(warning)] = false;
          return checkedIds;
        },
        {} as { [id: string]: boolean }
      ),
    };
  }

  public render() {
    const { warnings, closeFlyout, advanceNextStep } = this.props;
    const { checkedIds } = this.state;

    // Do not allow to proceed until all checkboxes are checked.
    const blockAdvance = Object.values(checkedIds).filter(v => v).length < warnings.length;

    return (
      <Fragment>
        <EuiFlyoutBody>
          <EuiCallOut
            title="This index requires destructive changes that can't be undone"
            color="danger"
            iconType="alert"
          >
            <p>
              Back up your index, then proceed with the reindex by accepting each breaking change.
            </p>
          </EuiCallOut>

          <EuiSpacer />

          {warnings.includes(ReindexWarning.allField) && (
            <EuiText>
              <EuiCheckbox
                id={idForWarning(ReindexWarning.allField)}
                label={
                  <strong>
                    <EuiCode>_all</EuiCode> field will be removed
                  </strong>
                }
                checked={checkedIds[idForWarning(ReindexWarning.allField)]}
                onChange={this.onChange}
              />
              <p className="upgWarningsStep__warningDescription">
                The <EuiCode>_all</EuiCode> meta field is no longer supported in 7.0. Reindexing
                removes the <EuiCode>_all</EuiCode> field in the new index. Ensure that no
                application code or scripts reply on this field.
                <br />
                <EuiLink
                  href="https://www.elastic.co/guide/en/elasticsearch/reference/6.0/breaking_60_mappings_changes.html#_the_literal__all_literal_meta_field_is_now_disabled_by_default"
                  target="_blank"
                >
                  Documentation
                </EuiLink>
              </p>
            </EuiText>
          )}

          <EuiSpacer />

          {warnings.includes(ReindexWarning.booleanFields) && (
            <EuiText>
              <EuiCheckbox
                id={idForWarning(ReindexWarning.booleanFields)}
                label={
                  <strong>
                    Boolean data in <EuiCode>_source</EuiCode> might change
                  </strong>
                }
                checked={checkedIds[idForWarning(ReindexWarning.booleanFields)]}
                onChange={this.onChange}
              />
              <p className="upgWarningsStep__warningDescription">
                If a documents contain a boolean field that is neither <EuiCode>true</EuiCode> or{' '}
                <EuiCode>false</EuiCode> (for example, <EuiCode>"yes"</EuiCode>,{' '}
                <EuiCode>"on"</EuiCode>, <EuiCode>1</EuiCode>), reindexing converts these fields to{' '}
                <EuiCode>true</EuiCode> or <EuiCode>false</EuiCode>. Ensure that no application code
                or scripts rely on boolean fields in the deprecated format.
                <br />
                <EuiLink
                  href="https://www.elastic.co/guide/en/elasticsearch/reference/6.0/breaking_60_mappings_changes.html#_coercion_of_boolean_fields"
                  target="_blank"
                >
                  Documentation
                </EuiLink>
              </p>
            </EuiText>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill color="danger" onClick={advanceNextStep} disabled={blockAdvance}>
                Continue with reindex
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </Fragment>
    );
  }

  private onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const optionId = e.target.id;
    const nextCheckedIds = {
      ...this.state.checkedIds,
      ...{
        [optionId]: !this.state.checkedIds[optionId],
      },
    };

    this.setState({ checkedIds: nextCheckedIds });
  };
}
