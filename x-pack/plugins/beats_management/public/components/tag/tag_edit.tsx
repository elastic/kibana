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
import React from 'react';
import { BeatTag, ConfigurationBlock } from '../../../common/domain_types';
import { ConfigList } from '../config_list';
import { ConfigView } from './config_view';
import { TagBadge } from './tag_badge';

interface TagEditProps {
  tag: BeatTag;
  configuration_blocks: {
    error?: string | undefined;
    list: ConfigurationBlock[];
    page: number;
    total: number;
  };
  onConfigListChange: (index: number, size: number) => void;
  onDetachBeat?: (beatIds: string[]) => void;
  onTagChange: (field: keyof BeatTag, value: string) => any;
  onConfigAddOrEdit: (block: ConfigurationBlock) => any;
  onConfigRemoved: (block: ConfigurationBlock) => any;
  attachedBeats?: {
    error?: string | undefined;
    list: ConfigurationBlock[];
    page: number;
    total: number;
  };
}

interface TagEditState {
  showFlyout: boolean;
  tableRef: any;
  selectedConfig?: ConfigurationBlock;
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
    const { tag, configuration_blocks } = this.props;

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
              <TagBadge tag={tag} />
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
                isInvalid={!!this.getNameError(tag.name)}
                error={this.getNameError(tag.name) || undefined}
              >
                <EuiFieldText
                  name="name"
                  isInvalid={!!this.getNameError(tag.name)}
                  onChange={this.updateTag('name')}
                  value={tag.name}
                  placeholder={i18n.translate('xpack.beatsManagement.tag.tagNamePlaceholder', {
                    defaultMessage: 'Tag name (required)',
                  })}
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.beatsManagement.tag.tagColorLabel', {
                  defaultMessage: 'Tag Color',
                })}
              >
                <EuiColorPicker color={tag.color} onChange={this.updateTag('color')} />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiHorizontalRule />
        <EuiFlexGroup alignItems="stretch">
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
                onTableChange={this.props.onConfigListChange}
                configs={configuration_blocks}
                onConfigClick={(action: string, block: ConfigurationBlock) => {
                  if (action === 'delete') {
                    this.props.onConfigRemoved(block);
                  } else {
                    this.setState({
                      showFlyout: true,
                      selectedConfig: block,
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
        {this.state.showFlyout && (
          <ConfigView
            configBlock={this.state.selectedConfig}
            onClose={() => this.setState({ showFlyout: false, selectedConfig: undefined })}
            onSave={(config: ConfigurationBlock) => {
              this.setState({ showFlyout: false, selectedConfig: undefined });
              this.props.onConfigAddOrEdit(config);
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

  private updateTag = (key: keyof BeatTag, value?: any) =>
    value !== undefined
      ? this.props.onTagChange(key, value)
      : (e: any) => this.props.onTagChange(key, e.target ? e.target.value : e);
}
