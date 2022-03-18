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
import { DataViewsContract } from 'src/plugins/data/public';
import { HttpSetup } from 'kibana/public';
import { DataView } from '../../../../../../../../src/plugins/data/common';

interface Props {
  onChange: (indexPattern: DataView) => void;
  value: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  IndexPatternSelectComponent: any;
  indexPatternService: DataViewsContract | undefined;
  http: HttpSetup;
  includedGeoTypes: string[];
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
    if (this.props.value) {
      this._loadIndexPattern(this.props.value);
    }
  }

  _loadIndexPattern = async (indexPatternId: string) => {
    if (!indexPatternId || indexPatternId.length === 0 || !this.props.indexPatternService) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await this.props.indexPatternService.get(indexPatternId);
    } catch (err) {
      return;
    }

    if (!this._isMounted || indexPattern.id !== indexPatternId) {
      return;
    }

    this.setState({
      doesIndexPatternHaveGeoField: indexPattern.fields.some((field) => {
        return this.props.includedGeoTypes.includes(field.type);
      }),
    });

    return indexPattern;
  };

  _onIndexPatternSelect = async (indexPatternId: string) => {
    const indexPattern = await this._loadIndexPattern(indexPatternId);
    if (indexPattern) {
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
          title={i18n.translate('xpack.stackAlerts.geoContainment.noIndexPattern.messageTitle', {
            defaultMessage: `Couldn't find any data views`,
          })}
          color="warning"
        >
          <p>
            <FormattedMessage
              id="xpack.stackAlerts.geoContainment.noIndexPattern.doThisPrefixDescription"
              defaultMessage="You'll need to "
            />
            <EuiLink href={this.props.http.basePath.prepend(`/app/management/kibana/dataViews`)}>
              <FormattedMessage
                id="xpack.stackAlerts.geoContainment.noIndexPattern.doThisLinkTextDescription"
                defaultMessage="Create a data view."
              />
            </EuiLink>
          </p>
          <p>
            <FormattedMessage
              id="xpack.stackAlerts.geoContainment.noIndexPattern.hintDescription"
              defaultMessage="Don't have any data? "
            />
            <EuiLink
              href={this.props.http.basePath.prepend('/app/home#/tutorial_directory/sampleData')}
            >
              <FormattedMessage
                id="xpack.stackAlerts.geoContainment.noIndexPattern.getStartedLinkText"
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
    const IndexPatternSelectComponent = this.props.IndexPatternSelectComponent;
    const isIndexPatternInvalid = !!this.props.value && !this.state.doesIndexPatternHaveGeoField;
    const error = isIndexPatternInvalid
      ? i18n.translate('xpack.stackAlerts.geoContainment.noGeoFieldInIndexPattern.message', {
          defaultMessage:
            'Data view does not contain any allowed geospatial fields. Must have one of type {geoFields}.',
          values: {
            geoFields: this.props.includedGeoTypes.join(', '),
          },
        })
      : '';

    return (
      <>
        {this._renderNoIndexPatternWarning()}

        <EuiFormRow
          label={i18n.translate('xpack.stackAlerts.geoContainment.indexPatternSelectLabel', {
            defaultMessage: 'Data view',
          })}
          isInvalid={isIndexPatternInvalid}
          error={error}
        >
          {IndexPatternSelectComponent ? (
            <IndexPatternSelectComponent
              isInvalid={isIndexPatternInvalid}
              isDisabled={this.state.noIndexPatternsExist}
              indexPatternId={this.props.value}
              onChange={this._onIndexPatternSelect}
              placeholder={i18n.translate(
                'xpack.stackAlerts.geoContainment.indexPatternSelectPlaceholder',
                {
                  defaultMessage: 'Select data view',
                }
              )}
              fieldTypes={this.props.includedGeoTypes}
              onNoIndexPatterns={this._onNoIndexPatterns}
              isClearable={false}
            />
          ) : (
            <div />
          )}
        </EuiFormRow>
      </>
    );
  }
}
