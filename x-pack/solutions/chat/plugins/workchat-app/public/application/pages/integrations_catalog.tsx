import React from 'react';
import { IntegrationCatalogView } from "../components/integrations/listing/integration_catalog_view";
import { useBreadcrumb } from "../hooks/use_breadcrumbs";

export const WorkChatCatalogPage: React.FC = () => {
    useBreadcrumb([{ text: 'Integrations' }]);
    return <IntegrationCatalogView />;
  };