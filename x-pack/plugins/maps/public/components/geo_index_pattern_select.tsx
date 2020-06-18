/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiCallOut, EuiFormRow, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { getIndexPatternSelectComponent, getHttp } from '../kibana_services';
import { ES_GEO_FIELD_TYPES } from '../../common/constants';

interface Props {
  onChange: (indexPatternId: string) => void;
  value: string | null;
}

interface State {
  noGeoIndexPatternsExist: Array<EuiComboBoxOptionOption<string>>;
}

export class GeoIndexPatternSelect extends Component<Props, State> {
  state = {
    noGeoIndexPatternsExist: false,
  };

  _onNoIndexPatterns = () => {
    this.setState({ noGeoIndexPatternsExist: true });
  };

  _renderNoIndexPatternWarning() {
    if (!this.state.noGeoIndexPatternsExist) {
      return null;
    }

    return (
      <>
        <EuiCallOut
          title={i18n.translate('xpack.maps.noIndexPattern.messageTitle', {
            defaultMessage: `Couldn't find any index patterns with geospatial fields`,
          })}
          color="warning"
        >
          <p>
            <FormattedMessage
              id="xpack.maps.noIndexPattern.doThisPrefixDescription"
              defaultMessage="You'll need to "
            />
            <EuiLink href={getHttp().basePath.prepend(`/app/management/kibana/indexPatterns`)}>
              <FormattedMessage
                id="xpack.maps.noIndexPattern.doThisLinkTextDescription"
                defaultMessage="create an index pattern"
              />
            </EuiLink>
            <FormattedMessage
              id="xpack.maps.noIndexPattern.doThisSuffixDescription"
              defaultMessage=" with geospatial fields."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.maps.noIndexPattern.hintDescription"
              defaultMessage="Don't have any geospatial data sets? "
            />
            <EuiLink href={getHttp().basePath.prepend('/app/home#/tutorial_directory/sampleData')}>
              <FormattedMessage
                id="xpack.maps.noIndexPattern.getStartedLinkText"
                defaultMessage="Get started with some sample data sets."
              />
            </EuiLink>
          </p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  }

  render() {
    const IndexPatternSelect = getIndexPatternSelectComponent();
    return (
      <>
        {this._renderNoIndexPatternWarning()}

        <EuiFormRow
          label={i18n.translate('xpack.maps.indexPatternSelectLabel', {
            defaultMessage: 'Index pattern',
          })}
        >
          <IndexPatternSelect
            isDisabled={this.state.noGeoIndexPatternsExist}
            indexPatternId={this.props.value}
            onChange={this.props.onChange}
            placeholder={i18n.translate('xpack.maps.indexPatternSelectPlaceholder', {
              defaultMessage: 'Select index pattern',
            })}
            fieldTypes={ES_GEO_FIELD_TYPES}
            onNoIndexPatterns={this._onNoIndexPatterns}
          />
        </EuiFormRow>
      </>
    );
  }
}
