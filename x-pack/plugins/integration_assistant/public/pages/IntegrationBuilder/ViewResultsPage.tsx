import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import DocResults from '@Components/IntegrationResults/DocsResults';
import PipelineResults from '@Components/IntegrationResults/PipelineResults';
import EmptyPrompt from '@components/EmptyPrompt/EmptyPrompt';
import FinalResultsButtons from '@components/ViewResults/ViewResultsButtons';
import RoutePaths from '@Constants/routePaths';

const ViewResultsPage = () => {
  const ingestPipeline = useGlobalStore((state) => state.ingestPipeline);
  const docs = useGlobalStore((state) => state.docs);

  if (Object.keys(ingestPipeline).length <= 0) {
    return (
      <EmptyPrompt
        title={'Ingest Pipeline is missing'}
        description={'No existing Ingest Pipeline was found. Go back to the ECS Mapping step.'}
        goBackPath={RoutePaths.CATEGORIZATION_PATH}
      />
    );
  }
  return (
      <EuiPageTemplate.Section grow={false}>
        <DocResults docs={docs} />
        <EuiSpacer />
        <PipelineResults pipeline={ingestPipeline} />
        <EuiSpacer />
        <FinalResultsButtons />
      </EuiPageTemplate.Section>
  );
};

export default ViewResultsPage;
