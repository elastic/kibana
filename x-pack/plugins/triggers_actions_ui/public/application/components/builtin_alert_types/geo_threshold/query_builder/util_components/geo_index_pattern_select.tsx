/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiCallOut, EuiFormRow, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { IndexPattern, IndexPatternsContract } from 'src/plugins/data/public';
import { HttpSetup } from 'kibana/public';
import { ES_GEO_FIELD_TYPES } from '../../types';

interface Props {
  onChange: (indexPattern: IndexPattern) => void;
  value: string | undefined;
  IndexPatternSelectComponent: unknown;
  indexPatternService: IndexPatternsContract;
  http: HttpSetup;
}

interface State {
  noGeoIndexPatternsExist: boolean;
}

export class GeoIndexPatternSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    noGeoIndexPatternsExist: false,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  _onIndexPatternSelect = async (indexPatternId: string) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await this.props.indexPatternService.get(indexPatternId);
    } catch (err) {
      return;
    }

    // method may be called again before 'get' returns
    // ignore response when fetched index pattern does not match active index pattern
    if (this._isMounted && indexPattern.id === indexPatternId) {
      this.props.onChange(indexPattern);
    }
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
          title={i18n.translate(
            'xpack.triggersActionsUI.geoThreshold.noIndexPattern.messageTitle',
            {
              defaultMessage: `Couldn't find any index patterns with geospatial fields`,
            }
          )}
          color="warning"
        >
          <p>
            <FormattedMessage
              id="xpack.triggersActionsUI.geoThreshold.noIndexPattern.doThisPrefixDescription"
              defaultMessage="You'll need to "
            />
            <EuiLink
              href={this.props.http.basePath.prepend(`/app/management/kibana/indexPatterns`)}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.geoThreshold.noIndexPattern.doThisLinkTextDescription"
                defaultMessage="create an index pattern"
              />
            </EuiLink>
            <FormattedMessage
              id="xpack.triggersActionsUI.geoThreshold.noIndexPattern.doThisSuffixDescription"
              defaultMessage=" with geospatial fields."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.triggersActionsUI.geoThreshold.noIndexPattern.hintDescription"
              defaultMessage="Don't have any geospatial data sets? "
            />
            <EuiLink
              href={this.props.http.basePath.prepend('/app/home#/tutorial_directory/sampleData')}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.geoThreshold.noIndexPattern.getStartedLinkText"
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
    const IndexPatternSelect = this.props.IndexPatternSelectComponent;
    return (
      <>
        {this._renderNoIndexPatternWarning()}

        <EuiFormRow
          label={i18n.translate('xpack.triggersActionsUI.geoThreshold.indexPatternSelectLabel', {
            defaultMessage: 'Index pattern',
          })}
        >
          <IndexPatternSelect
            isDisabled={this.state.noGeoIndexPatternsExist}
            indexPatternId={this.props.value}
            onChange={this._onIndexPatternSelect}
            placeholder={i18n.translate(
              'xpack.triggersActionsUI.geoThreshold.indexPatternSelectPlaceholder',
              {
                defaultMessage: 'Select index pattern',
              }
            )}
            fieldTypes={ES_GEO_FIELD_TYPES}
            onNoIndexPatterns={this._onNoIndexPatterns}
            isClearable={false}
          />
        </EuiFormRow>
      </>
    );
  }
}
