import { EuiPageTemplate } from '@elastic/eui';
import BuildIntegrationButtons from '@components/BuildIntegration/BuildIntegrationButtons';

const BuildIntegration = () => {
  return (
      <EuiPageTemplate.Section grow={false}>
        <BuildIntegrationButtons />
      </EuiPageTemplate.Section>
  );
};

export default BuildIntegration;
