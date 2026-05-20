import type { EuiLinkAnchorProps } from '@elastic/eui';
type DocsSection = '/apm/get-started' | '/x-pack' | '/apm/server' | '/kibana' | '/elasticsearch/reference' | '/cloud';
interface Props extends EuiLinkAnchorProps {
    section: DocsSection;
    path: string;
}
export declare function ElasticDocsLink({ section, path, children, ...rest }: Props): any;
export {};
