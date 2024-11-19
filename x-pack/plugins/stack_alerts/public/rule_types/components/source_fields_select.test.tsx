/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { SourceFields } from './source_fields_select';
import { SourceField } from '../es_query/types';

const AppWrapper = React.memo<PropsWithChildren<unknown>>(({ children }) => (
  <I18nProvider>{children}</I18nProvider>
));

describe('SourceFields', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render SourceFields component if there are valid sourceFields', () => {
    const result = render(
      <SourceFields
        onChangeSourceFields={() => {}}
        esFields={[
          {
            name: 'host.name',
            type: 'type',
            normalizedType: 'type',
            searchable: true,
            aggregatable: true,
          },
        ]}
        sourceFields={[]}
        errors={[]}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    expect(result.getByTestId('sourceFields')).toBeInTheDocument();
  });

  it('should not render SourceFields component if there are not valid sourceFields', () => {
    const result = render(
      <SourceFields
        onChangeSourceFields={() => {}}
        esFields={[
          {
            name: 'test',
            type: 'type',
            normalizedType: 'type',
            searchable: true,
            aggregatable: true,
          },
        ]}
        sourceFields={[]}
        errors={[]}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    expect(result.queryByTestId('sourceFields')).not.toBeInTheDocument();
  });

  it('should render sourceFields param', () => {
    const result = render(
      <SourceFields
        onChangeSourceFields={() => {}}
        esFields={[
          {
            name: 'host.name',
            type: 'type',
            normalizedType: 'type',
            searchable: true,
            aggregatable: true,
          },
        ]}
        sourceFields={[{ label: 'host.name', searchPath: 'host.name' }]}
        errors={[]}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    expect(result.getByTestId('option-host.name')).toBeInTheDocument();
  });

  it('should auto select valid sourceFields if sourceFields param is not defined', async () => {
    let sourceFields: SourceField[] | undefined;
    const onChange = (fields: SourceField[]) => {
      sourceFields = fields;
    };
    const { rerender } = render(
      <SourceFields
        onChangeSourceFields={onChange}
        esFields={[
          {
            name: 'host.name',
            type: 'type',
            normalizedType: 'type',
            searchable: true,
            aggregatable: true,
          },
        ]}
        sourceFields={sourceFields}
        errors={[]}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    await waitFor(() => {
      rerender(
        <SourceFields
          onChangeSourceFields={onChange}
          esFields={[
            {
              name: 'host.name',
              type: 'type',
              normalizedType: 'type',
              searchable: true,
              aggregatable: true,
            },
          ]}
          sourceFields={sourceFields}
          errors={[]}
        />
      );
      expect(screen.getByTestId('option-host.name')).toBeInTheDocument();
    });
  });

  it('should remove duplicate and non-aggregatable esFields and handle keyword esFields', async () => {
    let sourceFields: SourceField[] | undefined;
    const onChange = (fields: SourceField[]) => {
      sourceFields = fields;
    };
    const esFields = [
      {
        name: 'host.name',
        type: 'type',
        normalizedType: 'type',
        searchable: true,
        aggregatable: false,
      },
      {
        name: 'host.hostname',
        type: 'type',
        normalizedType: 'type',
        searchable: true,
        aggregatable: true,
      },
      {
        name: 'host.hostname.keyword',
        type: 'type',
        normalizedType: 'type',
        searchable: true,
        aggregatable: true,
      },
      {
        name: 'host.id.keyword',
        type: 'type',
        normalizedType: 'type',
        searchable: true,
        aggregatable: true,
      },
    ];
    const { rerender } = render(
      <SourceFields
        onChangeSourceFields={onChange}
        esFields={esFields}
        sourceFields={sourceFields}
        errors={[]}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    await waitFor(() => {
      rerender(
        <SourceFields
          onChangeSourceFields={onChange}
          esFields={esFields}
          sourceFields={sourceFields}
          errors={[]}
        />
      );
      expect(screen.queryByTestId('option-host.name')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('option-host.hostname')).toHaveLength(1);
      expect(screen.getByTestId('option-host.id')).toBeInTheDocument();
    });
  });

  it('should render SourceFields component with errors', () => {
    const result = render(
      <SourceFields
        onChangeSourceFields={() => {}}
        esFields={[
          {
            name: 'host.name',
            type: 'type',
            normalizedType: 'type',
            searchable: true,
            aggregatable: true,
          },
        ]}
        sourceFields={[]}
        errors={['test error']}
      />,
      {
        wrapper: AppWrapper,
      }
    );

    expect(result.getByText('test error')).toBeInTheDocument();
  });
});
