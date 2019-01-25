/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  // @ts-ignore
  EuiColorPicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import 'brace/mode/yaml';
import 'brace/theme/github';
import { isEqual } from 'lodash';
import React from 'react';
import { BeatTag, CMBeat, ConfigurationBlock } from '../../../common/domain_types';
import { ConfigList } from '../config_list';
import { AssignmentActionType, BeatsTableType, Table, tagConfigActions } from '../table';
import { ConfigView } from './config_view';
import { TagBadge } from './tag_badge';

interface TagEditProps {
  tag: Pick<BeatTag, Exclude<keyof BeatTag, 'last_updated'>>;
  onDetachBeat?: (beatIds: string[]) => void;
  onTagChange: (field: keyof BeatTag, value: string) => any;
  attachedBeats?: CMBeat[];
}

interface TagEditState {
  showFlyout: boolean;
  tableRef: any;
  selectedConfigIndex?: number;
}

export class TagEdit extends React.PureComponent<TagEditProps, TagEditState> {
  constructor(props: TagEditProps) {
    super(props);

    this.state = {
      showFlyout: false,
      tableRef: React.createRef(),
    };
  }

  public render() {
    const { tag, attachedBeats } = this.props;
    return (
      <div>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.beatsManagement.tag.tagDetailsTitle"
                  defaultMessage="Tag details"
                />
              </h3>
            </EuiTitle>
            <EuiText color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.beatsManagement.tag.tagDetailsDescription"
                  defaultMessage="A tag is a group of configuration blocks that you can apply to one or more Beats."
                />
              </p>
            </EuiText>
            <div>
              <TagBadge tag={{ color: tag.color || '#FF0', id: tag.id }} />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiForm>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.beatsManagement.tag.tagNameLabel"
                    defaultMessage="Tag Name"
                  />
                }
                isInvalid={!!this.getNameError(tag.id)}
                error={this.getNameError(tag.id) || undefined}
              >
                <EuiFieldText
                  name="name"
                  isInvalid={!!this.getNameError(tag.id)}
                  onChange={this.updateTag('id')}
                  disabled={!!this.props.onDetachBeat}
                  value={tag.id}
                  placeholder={i18n.translate('xpack.beatsManagement.tag.tagNamePlaceholder', {
                    defaultMessage: 'Tag name (required)',
                  })}
                />
              </EuiFormRow>
              {!this.props.onDetachBeat && (
                <EuiFormRow
                  label={i18n.translate('xpack.beatsManagement.tag.tagColorLabel', {
                    defaultMessage: 'Tag Color',
                  })}
                >
                  <EuiColorPicker color={tag.color} onChange={this.updateTag('color')} />
                </EuiFormRow>
              )}
            </EuiForm>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiHorizontalRule />

        <EuiFlexGroup
          alignItems={
            tag.configuration_blocks && tag.configuration_blocks.length ? 'stretch' : 'center'
          }
        >
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.beatsManagement.tag.tagConfigurationsTitle"
                  defaultMessage="Configuration blocks"
                />
              </h3>
            </EuiTitle>
            <EuiText color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.beatsManagement.tag.tagConfigurationsDescription"
                  defaultMessage="A tag can have configuration blocks for different types of Beats. For example, a tag
                  can have two Metricbeat configuration blocks and one Filebeat input configuration block."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <div>
              <ConfigList
                configs={tag.configuration_blocks}
                onConfigClick={(action: string, config: ConfigurationBlock) => {
                  const selectedIndex = tag.configuration_blocks.findIndex(c => {
                    return isEqual(config, c);
                  });
                  if (action === 'delete') {
                    const configs = [...tag.configuration_blocks];
                    configs.splice(selectedIndex, 1);
                    this.updateTag('configuration_blocks', configs);
                  } else {
                    this.setState({
                      showFlyout: true,
                      selectedConfigIndex: selectedIndex,
                    });
                  }
                }}
              />
              <br />
              <EuiButton
                onClick={() => {
                  this.setState({ showFlyout: true });
                }}
              >
                <FormattedMessage
                  id="xpack.beatsManagement.tag.addConfigurationButtonLabel"
                  defaultMessage="Add configuration block"
                />
              </EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        {attachedBeats && (
          <div>
            <EuiHorizontalRule />

            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.beatsManagement.tag.beatsAssignedToTagTitle"
                  defaultMessage="Beats with this tag"
                />
              </h3>
            </EuiTitle>
            <Table
              actions={tagConfigActions}
              actionHandler={this.handleAssignmentActions}
              items={attachedBeats}
              ref={this.state.tableRef}
              type={BeatsTableType}
            />
          </div>
        )}

        {this.state.showFlyout && (
          <ConfigView
            configBlock={
              this.state.selectedConfigIndex !== undefined
                ? tag.configuration_blocks[this.state.selectedConfigIndex]
                : undefined
            }
            onClose={() => this.setState({ showFlyout: false, selectedConfigIndex: undefined })}
            onSave={(config: any) => {
              this.setState({ showFlyout: false, selectedConfigIndex: undefined });
              if (this.state.selectedConfigIndex !== undefined) {
                const configs = [...tag.configuration_blocks];
                configs[this.state.selectedConfigIndex] = config;
                this.updateTag('configuration_blocks', configs);
              } else {
                this.updateTag('configuration_blocks', [
                  ...(tag.configuration_blocks || []),
                  config,
                ]);
              }
            }}
          />
        )}
      </div>
    );
  }

  private getNameError = (name: string) => {
    if (name && name !== '' && name.search(/^[a-zA-Z0-9-]+$/) === -1) {
      return i18n.translate('xpack.beatsManagement.tag.tagName.validationErrorMessage', {
        defaultMessage: 'Tag name must consist of letters, numbers, and dashes only',
      });
    } else {
      return false;
    }
  };

  private handleAssignmentActions = (action: AssignmentActionType) => {
    switch (action) {
      case AssignmentActionType.Delete:
        const { selection } = this.state.tableRef.current.state;
        if (this.props.onDetachBeat) {
          this.props.onDetachBeat(selection.map((beat: any) => beat.id));
        }
    }
  };

  private updateTag = (key: keyof BeatTag, value?: any) =>
    value !== undefined
      ? this.props.onTagChange(key, value)
      : (e: any) => this.props.onTagChange(key, e.target ? e.target.value : e);
}
