/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiCallOut, EuiFormRow, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataView } from '@kbn/data-plugin/common';
import {
  getIndexPatternSelectComponent,
  getIndexPatternService,
  getHttp,
} from '../kibana_services';
import { getDataViewLabel, getDataViewSelectPlaceholder } from '../../common/i18n_getters';
import { ES_GEO_FIELD_TYPE, ES_GEO_FIELD_TYPES } from '../../common/constants';

interface Props {
  onChange: (indexPattern: DataView) => void;
  value: string | null;
  isGeoPointsOnly?: boolean;
}

interface State {
  doesIndexPatternHaveGeoField: boolean;
  noIndexPatternsExist: boolean;
}

export class GeoIndexPatternSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    doesIndexPatternHaveGeoField: false,
    noIndexPatternsExist: false,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  _onIndexPatternSelect = async (indexPatternId?: string) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(indexPatternId);
    } catch (err) {
      return;
    }

    // method may be called again before 'get' returns
    // ignore response when fetched index pattern does not match active index pattern
    if (this._isMounted && indexPattern.id === indexPatternId) {
      this.setState({
        doesIndexPatternHaveGeoField: indexPattern.fields.some((field) => {
          return this.props?.isGeoPointsOnly
            ? (ES_GEO_FIELD_TYPE.GEO_POINT as string) === field.type
            : ES_GEO_FIELD_TYPES.includes(field.type);
        }),
      });
      this.props.onChange(indexPattern);
    }
  };

  _onNoIndexPatterns = () => {
    this.setState({ noIndexPatternsExist: true });
  };

  _renderNoIndexPatternWarning() {
    if (!this.state.noIndexPatternsExist) {
      return null;
    }

    return (
      <>
        <EuiCallOut
          title={i18n.translate('xpack.maps.noIndexPattern.messageTitle', {
            defaultMessage: `Couldn't find any data views`,
          })}
          color="warning"
        >
          <p>
            <FormattedMessage
              id="xpack.maps.noIndexPattern.doThisPrefixDescription"
              defaultMessage="You'll need to "
            />
            <EuiLink href={getHttp().basePath.prepend(`/app/management/kibana/dataViews`)}>
              <FormattedMessage
                id="xpack.maps.noIndexPattern.doThisLinkTextDescription"
                defaultMessage="Create a data view."
              />
            </EuiLink>
          </p>
          <p>
            <FormattedMessage
              id="xpack.maps.noIndexPattern.hintDescription"
              defaultMessage="Don't have any data? "
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
    const isIndexPatternInvalid = !!this.props.value && !this.state.doesIndexPatternHaveGeoField;
    const error = isIndexPatternInvalid
      ? i18n.translate('xpack.maps.noGeoFieldInIndexPattern.message', {
          defaultMessage: 'Data view does not contain any geospatial fields',
        })
      : '';
    return (
      <>
        {this._renderNoIndexPatternWarning()}

        <EuiFormRow label={getDataViewLabel()} isInvalid={isIndexPatternInvalid} error={error}>
          <IndexPatternSelect
            isInvalid={isIndexPatternInvalid}
            isDisabled={this.state.noIndexPatternsExist}
            indexPatternId={this.props.value ? this.props.value : ''}
            onChange={this._onIndexPatternSelect}
            placeholder={getDataViewSelectPlaceholder()}
            onNoIndexPatterns={this._onNoIndexPatterns}
            isClearable={false}
            data-test-subj="mapGeoIndexPatternSelect"
          />
        </EuiFormRow>
      </>
    );
  }
}
