import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SERVICE_MAP_ATTACHMENT_TYPE, type ServiceMapAttachmentData } from '../../../common/agent_builder/attachments';
export declare const createServiceMapAttachmentType: () => AttachmentTypeDefinition<typeof SERVICE_MAP_ATTACHMENT_TYPE, ServiceMapAttachmentData>;
