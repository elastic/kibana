import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';

import EmptyPrompt from '@components/EmptyPrompt/EmptyPrompt';
import CategorizationButtons from '@Components/Categorization/CategorizationButtons';
import PipelineResults from '@Components/IntegrationResults/PipelineResults';
import RoutePaths from '@Constants/routePaths';

const CategorizationPage = () => {
  const ingestPipeline = useGlobalStore((state) => state.ingestPipeline);

  if (Object.keys(ingestPipeline).length <= 0) {
    return (
      <EmptyPrompt
        title={'Ingest Pipeline is missing'}
        description={'No existing Ingest Pipeline was found. Go back to the ECS Mapping step.'}
        goBackPath={RoutePaths.ECS_MAPPING_PATH}
      />
    );
  }
  return (
      <EuiPageTemplate.Section>
        <PipelineResults pipeline={ingestPipeline} />
        <EuiSpacer />
        <CategorizationButtons />
      </EuiPageTemplate.Section>
  );
};

export default CategorizationPage;
