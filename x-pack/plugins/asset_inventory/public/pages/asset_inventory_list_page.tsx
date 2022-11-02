/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import axios from 'axios';
import { PageTemplate } from '../lib/page_template';
import { Asset } from '../../common/types_api';
import { AssetsTable } from '../components/assets_table';

export function AssetInventoryListPage() {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    async function retrieve() {
      const response = await axios.get('/local/api/asset-inventory');
      if (response.data && response.data.assets) {
        setAssets(response.data.assets);
      }
    }
    retrieve();
  }, []);

  return (
    <PageTemplate>
      <EuiPageTemplate.Header pageTitle="Asset Inventory List" />
      <EuiPageTemplate.Section>
        <AssetsTable assets={assets} />
      </EuiPageTemplate.Section>
    </PageTemplate>
  );
}
