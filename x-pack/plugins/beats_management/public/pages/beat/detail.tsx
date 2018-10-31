/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore EuiInMemoryTable typings not yet available
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { flatten, get } from 'lodash';
import React from 'react';
import { TABLE_CONFIG } from '../../../common/constants';
import { BeatTag, CMPopulatedBeat, ConfigurationBlock } from '../../../common/domain_types';
import { ConnectedLink } from '../../components/connected_link';
import { TagBadge } from '../../components/tag';
import { ConfigView } from '../../components/tag/config_view/index';
import { supportedConfigs } from '../../config_schemas';

interface PageProps {
  beat: CMPopulatedBeat | undefined;
}

interface PageState {
  selectedConfig: ConfigurationBlock | null;
}

export class BeatDetailPage extends React.PureComponent<PageProps, PageState> {
  constructor(props: PageProps) {
    super(props);

    this.state = {
      selectedConfig: null,
    };
  }
  public render() {
    const props = this.props;
    const { beat } = props;
    if (!beat) {
      return <div>Beat not found</div>;
    }
    const configurationBlocks = flatten(
      beat.full_tags.map((tag: BeatTag) => {
        return tag.configuration_blocks.map(configuration => ({
          // @ts-ignore one of the types on ConfigurationBlock doesn't define a "module" property
          module: configuration.configs[0].module || null,
          tagId: tag.id,
          tagColor: tag.color,
          ...beat,
          ...configuration,
          displayValue: get(
            supportedConfigs.find(config => config.value === configuration.type),
            'text',
            null
          ),
        }));
      })
    );

    const columns = [
      {
        field: 'displayValue',
        name: 'Type',
        sortable: true,
        render: (value: string | null, configuration: any) => (
          <EuiLink
            onClick={() => {
              this.setState({
                selectedConfig: configuration,
              });
            }}
          >
            {value || configuration.type}
          </EuiLink>
        ),
      },
      {
        field: 'module',
        name: 'Module',
        sortable: true,
      },
      {
        field: 'description',
        name: 'Description',
        sortable: true,
      },
      {
        field: 'tagId',
        name: 'Tag',
        render: (id: string, block: any) => (
          <ConnectedLink path={`/tag/edit/${id}`}>
            <TagBadge
              maxIdRenderSize={TABLE_CONFIG.TRUNCATE_TAG_LENGTH_SMALL}
              tag={{ color: block.tagColor, id }}
            />
          </ConnectedLink>
        ),
        sortable: true,
      },
    ];
    return (
      <React.Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>Configurations</h4>
            </EuiTitle>
            <EuiText size="s">
              <p>
                You can have multiple configurations applied to an individual tag. These
                configurations can repeat or mix types as necessary. For example, you may utilize
                three metricbeat configurations alongside one input and filebeat configuration.
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiInMemoryTable columns={columns} items={configurationBlocks} />
          </EuiFlexItem>
        </EuiFlexGroup>
        {this.state.selectedConfig && (
          <ConfigView
            configBlock={this.state.selectedConfig}
            onClose={() => this.setState({ selectedConfig: null })}
          />
        )}
      </React.Fragment>
    );
  }
}
