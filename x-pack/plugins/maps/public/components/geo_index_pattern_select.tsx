/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { EuiCallOut, EuiFormRow, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { indexPatterns } from '@kbn/data-plugin/public';
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
  dataView?: DataView | null;
  isGeoPointsOnly?: boolean;
}

export function GeoIndexPatternSelect(props: Props) {
  const [noDataViews, setNoDataViews] = useState(false);

  const hasGeoFields = useMemo(() => {
    return props.dataView
      ? props.dataView.fields.some((field) => {
          return !indexPatterns.isNestedField(field) && props?.isGeoPointsOnly
            ? (ES_GEO_FIELD_TYPE.GEO_POINT as string) === field.type
            : ES_GEO_FIELD_TYPES.includes(field.type);
        })
      : false;
  }, [props.dataView, props?.isGeoPointsOnly]);

  const isMounted = useMountedState();
  const dataViewIdRef = useRef<string | undefined>();

  async function _onIndexPatternSelect(indexPatternId?: string) {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    dataViewIdRef.current = indexPatternId;
    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(indexPatternId);
    } catch (err) {
      return;
    }

    // method may be called again before 'get' returns
    // ignore response when fetched index pattern does not match active index pattern
    if (isMounted() && indexPattern.id === dataViewIdRef.current) {
      props.onChange(indexPattern);
    }
  }

  function _renderNoIndexPatternWarning() {
    if (!noDataViews) {
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

  const IndexPatternSelect = getIndexPatternSelectComponent();
  const error = !hasGeoFields
    ? i18n.translate('xpack.maps.noGeoFieldInIndexPattern.message', {
        defaultMessage: 'Data view does not contain any geospatial fields',
      })
    : '';

  return (
    <>
      {_renderNoIndexPatternWarning()}

      <EuiFormRow label={getDataViewLabel()} isInvalid={!hasGeoFields} error={error}>
        <IndexPatternSelect
          isInvalid={!hasGeoFields}
          isDisabled={noDataViews}
          indexPatternId={props.dataView?.id ? props.dataView.id : ''}
          onChange={_onIndexPatternSelect}
          placeholder={getDataViewSelectPlaceholder()}
          onNoIndexPatterns={() => {
            setNoDataViews(true);
          }}
          isClearable={false}
          data-test-subj="mapGeoIndexPatternSelect"
        />
      </EuiFormRow>
    </>
  );
}
