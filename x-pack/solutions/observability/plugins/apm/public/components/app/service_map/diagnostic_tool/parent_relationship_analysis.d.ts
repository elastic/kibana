import React from 'react';
interface ParentRelationshipAnalysisProps {
    hasParent: boolean;
    destinationHits: any[];
    sourceNode: string;
    destinationNode: string;
}
export declare function ParentRelationshipAnalysis({ hasParent, destinationHits, sourceNode, destinationNode, }: ParentRelationshipAnalysisProps): React.JSX.Element;
export {};
