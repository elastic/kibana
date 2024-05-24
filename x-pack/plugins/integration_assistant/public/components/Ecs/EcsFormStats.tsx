import { EuiStat, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';

const EcsFormStats = () => {
  const sampleCount = useGlobalStore((state) => state.sampleCount);
  const uniqueKeysCount = useGlobalStore((state) => state.uniqueKeysCount);
  const ecsMappingTableItemsWithEcs = useGlobalStore((state) => state.ecsMappingTableItemsWithEcs);

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup justifyContent="spaceEvenly">
        <EuiFlexItem>
          <EuiStat title={sampleCount} textAlign="center" description="Samples found" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={uniqueKeysCount} textAlign="center" description="Unique Fields" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat title={ecsMappingTableItemsWithEcs} textAlign="center" description="ECS Fields" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={ecsMappingTableItemsWithEcs === 0 ? 0 : uniqueKeysCount - ecsMappingTableItemsWithEcs}
            textAlign="center"
            description="Unmapped Fields"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export default EcsFormStats;
