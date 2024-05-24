import { EuiPageTemplate } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import IntegrationBuilderSteps from '@Components/IntegrationBuilderSteps/IntegrationBuilderSteps';
import ProgressPortal from '@Components/Portal/ProgressPortal';
import { useGlobalStore } from '@Stores/useGlobalStore';
import HeaderTitles from '@Constants/headerTitles';

const IntegrationBuilderHeader = () => {
    const location = useLocation();
    const isPortalLoading = useGlobalStore((state) => state.isPortalLoading);
    const pageTitle = HeaderTitles[location.pathname as keyof typeof HeaderTitles] || 'Unknown Page';
  return (
    <>
    <EuiPageTemplate.Header pageTitle={pageTitle} />
      {pageTitle && pageTitle != 'Base Page' && <IntegrationBuilderSteps />}
      {isPortalLoading && <ProgressPortal />}
      </>
  );
};

export default IntegrationBuilderHeader;
