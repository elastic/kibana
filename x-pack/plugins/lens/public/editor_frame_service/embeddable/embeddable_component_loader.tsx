/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Suspense, useState, useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { LensEmbeddableDeps } from './embeddable';
import { LensAttributeService } from '../../lens_attribute_service';
import { LensProps } from './embeddable_component';

const LazyLensComponent = React.lazy(() => import('./embeddable_component'));

export function getEmbeddableComponent({
  attributeService: getAttributeService,
  ...deps
}: Omit<LensEmbeddableDeps, 'attributeService'> & {
  attributeService: () => Promise<LensAttributeService>;
}) {
  return function LensLoader(props: LensProps) {
    const [attributeService, setAttributeService] = useState<LensAttributeService | undefined>(
      undefined
    );
    useEffect(() => {
      (async () => {
        const value = await getAttributeService();
        setAttributeService(value);
      })();
    }, []);
    if (!attributeService) {
      return null;
    }
    return (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyLensComponent props={props} deps={{ ...deps, attributeService }} />
      </Suspense>
    );
  };
}
